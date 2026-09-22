/**
 * The deterministic gate around any verifier (runs without the source cache or
 * an API key). A model's quote only survives if it is verbatim in the page it
 * names; "supported" without surviving evidence is downgraded.
 */
import { expect, test } from "bun:test";
import {
  rejectionReason,
  validateOutput,
  type Verifier,
  type VerifierInput,
} from "../scripts/verify/verifiers";
import { score } from "./verifier";

const page = {
  url: "https://example.org/komodo",
  text: "Monsoon winds blow in June, July and into August. During this period the southern areas of the park can have rough seas.",
};
const input: VerifierInput = {
  claimId: "x/operating",
  label: "Access",
  text: "Southern access is limited Dec-Feb.",
  pages: [page],
};

test("a verbatim quote survives; a paraphrased one is rejected", () => {
  const { output, rejectedQuotes } = validateOutput(
    {
      verdict: "contradicted",
      quotes: [
        { url: page.url, text: "the southern areas of the park can have rough seas" },
        { url: page.url, text: "the south is rough in winter" },
      ],
      conflict: null,
      note: "",
    },
    input,
  );
  expect(output.quotes).toHaveLength(1);
  expect(rejectedQuotes).toHaveLength(1);
  expect(output.verdict).toBe("contradicted");
});

test("a quote attributed to a page that wasn't provided is rejected", () => {
  const { rejectedQuotes } = validateOutput(
    {
      verdict: "partial",
      quotes: [{ url: "https://elsewhere.example", text: "Monsoon winds blow in June" }],
      conflict: null,
      note: "",
    },
    input,
  );
  expect(rejectedQuotes).toHaveLength(1);
});

test("'supported' with no surviving evidence is downgraded to not_found", () => {
  const { output } = validateOutput(
    {
      verdict: "supported",
      quotes: [{ url: page.url, text: "access is limited from December to February" }],
      conflict: null,
      note: "",
    },
    input,
  );
  expect(output.verdict).toBe("not_found");
});

test("quotes longer than 25 words are rejected, even when verbatim", () => {
  const longPage = { url: page.url, text: `${page.text} ${page.text}` };
  const long = longPage.text.split(/\s+/).slice(0, 26).join(" ");
  const { rejectedQuotes } = validateOutput(
    { verdict: "partial", quotes: [{ url: page.url, text: long }], conflict: null, note: "" },
    { ...input, pages: [longPage] },
  );
  expect(rejectedQuotes).toHaveLength(1);
});

test("scoring: false support, contradiction recall and hallucination rate", async () => {
  const cases = [
    { input: { ...input, claimId: "a" }, gold: "contradicted" as const },
    { input: { ...input, claimId: "b" }, gold: "supported" as const },
    { input: { ...input, claimId: "c" }, gold: "not_found" as const },
  ];
  // A credulous fake: always "supported", sometimes with an invented quote.
  const credulous: Verifier = async (i) => ({
    verdict: "supported",
    quotes: [
      {
        url: page.url,
        text: i.claimId === "b" ? "Monsoon winds blow in June" : "access is limited in winter",
      },
    ],
    conflict: null,
    note: "",
  });
  const s = await score(cases, credulous);
  // a and c lose their invented quotes and are downgraded; b stands.
  expect(s.falseSupportRate).toBe(0);
  // Both rejected quotes are invented, not just too long: rejected = fabricated here.
  expect(s.rejectedQuoteRate).toBeCloseTo(2 / 3);
  expect(s.fabricatedQuoteRate).toBeCloseTo(2 / 3);
  expect(s.rejections).toEqual({ not_in_page: 2 });
  expect(s.contradictionRecall).toBe(0);
  expect(s.confusion.supported.supported).toBe(1);
});

test("a rejected quote says why: fabricated is not the same as too long", () => {
  const long = page.text.split(" ").slice(0, 22).join(" ");
  expect(rejectionReason({ url: page.url, text: "the south is rough in winter" }, input)).toBe(
    "not_in_page",
  );
  expect(rejectionReason({ url: "https://elsewhere.example", text: "Monsoon winds" }, input)).toBe(
    "url_not_cited",
  );
  // Verbatim, but longer than the 25-word limit on quotes.
  const over = {
    url: page.url,
    text: `${page.text} ${page.text}`.split(" ").slice(0, 30).join(" "),
  };
  expect(
    rejectionReason(over, { ...input, pages: [{ ...page, text: `${page.text} ${page.text}` }] }),
  ).toBe("over_25_words");
  // Two verbatim fragments joined with an ellipsis.
  expect(
    rejectionReason(
      { url: page.url, text: "Monsoon winds blow in June... can have rough seas" },
      input,
    ),
  ).toBe("spliced");
  expect(rejectionReason({ url: page.url, text: long }, input)).toBeNull();
});
