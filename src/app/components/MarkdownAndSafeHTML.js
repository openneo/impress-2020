import React from "react";
import { ClassNames } from "@emotion/react";
import { Box } from "@chakra-ui/react";
import SimpleMarkdown from "simple-markdown";
import DOMPurify from "dompurify";

const unsafeMarkdownRules = {
  autolink: SimpleMarkdown.defaultRules.autolink,
  br: SimpleMarkdown.defaultRules.br,
  em: SimpleMarkdown.defaultRules.em,
  escape: SimpleMarkdown.defaultRules.escape,
  link: SimpleMarkdown.defaultRules.link,
  list: SimpleMarkdown.defaultRules.list,
  newline: SimpleMarkdown.defaultRules.newline,
  paragraph: SimpleMarkdown.defaultRules.paragraph,
  strong: SimpleMarkdown.defaultRules.strong,
  u: SimpleMarkdown.defaultRules.u,

  // DANGER: We override Markdown's `text` rule to _not_ escape HTML. This is
  // intentional, to allow users to embed some limited HTML. DOMPurify is
  // responsible for sanitizing the HTML afterward. Do not use these rules
  // without sanitizing!!
  text: {
    ...SimpleMarkdown.defaultRules.text,
    html: (node) => node.content,
  },
};
const markdownParser = SimpleMarkdown.parserFor(unsafeMarkdownRules);
const unsafeMarkdownOutput = SimpleMarkdown.htmlFor(
  SimpleMarkdown.ruleOutput(unsafeMarkdownRules, "html")
);

/**
 * MarkdownAndSafeHTML renders its children as a Markdown string, with some
 * safe inline HTML allowed.
 *
 * Rendering this component *should* be XSS-safe, it's designed to strip out
 * bad things! Still, be careful when using it, and consider what you're doing!
 */
function MarkdownAndSafeHTML({ children, onBeforeSanitizeNode }) {
  const htmlAndMarkdown = children;

  const unsafeHtml = unsafeMarkdownOutput(markdownParser(htmlAndMarkdown));

  if (onBeforeSanitizeNode) {
    DOMPurify.addHook("beforeSanitizeAttributes", onBeforeSanitizeNode);
  }
  const sanitizedHtml = DOMPurify.sanitize(unsafeHtml, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "u",
      "strong",
      "em",
      "a",
      "p",
      "div",
      "br",
      "ol",
      "ul",
      "li",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "class"],
    // URL must either start with an approved host (external link), or with a
    // slash or hash (internal link).
    ALLOWED_URI_REGEXP: /^https?:\/\/(impress\.openneo\.net|impress-2020\.openneo\.net|www\.neopets\.com|neopets\.com|items\.jellyneo\.net)\/|^[/#]/,
  });
  if (onBeforeSanitizeNode) {
    DOMPurify.removeHook("beforeSanitizeAttributes");
  }

  return (
    <ClassNames>
      {({ css }) => (
        <Box
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          className={css`
            .paragraph,
            ol,
            ul {
              margin-bottom: 1em;
            }

            ol,
            ul {
              margin-left: 2em;
            }
          `}
        />
      )}
    </ClassNames>
  );
}

export default MarkdownAndSafeHTML;
