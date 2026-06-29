module.exports = {
  layout: "layouts/news-article.njk",
  eleventyComputed: {
    permalink: (data) => {
      // 1. Калі ў файле ўжо явна прапісаны permalink — выкарыстоўваем яго (старыя артыкулы).
      if (data.permalink) return data.permalink;
      // 2. Калі аўтар запоўніў кароткую спасылку (url_slug) праз CMS — будуем адрас з яе.
      if (data.url_slug) return `/news/${data.url_slug}.html`;
      // 3. Інакш (поле пустое) — резервовы варыянт: будуем з імя файла,
      // прыбіраючы прэфікс даты (фармат слага: YYYY-MM-DD-slug.md -> /news/slug.html).
      const slug = data.page.fileSlug.replace(/^\d{4}-\d{2}-\d{2}-/, "");
      return `/news/${slug}.html`;
    },
  },
};
