export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "site/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "site/CNAME": "CNAME" });

  return {
    dir: {
      input: "site",
      includes: "_includes",
      output: "dist-pages",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
