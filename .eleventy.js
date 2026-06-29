const markdownIt = require("markdown-it");
const md = new markdownIt({ html: true });

module.exports = function (eleventyConfig) {
  // Дазваляе выкарыстоўваць у шаблонах {{ field | markdown | safe }}
  // для палёў з content/*.md, якія ўтрымліваюць markdown-разметку
  // (напр. **жирны тэкст**, спасылкі і г.д.)
  eleventyConfig.addFilter("markdown", (value) => md.render(value || ""));

  // Для буквіцы (lettrine) — першая літара і астатні тэкст акрэма.
  // Пішу свае фільтры, а не спадзяюся на ўбудаваны "slice" Nunjucks,
  // які працуе інакш, чым String.prototype.slice() у JavaScript.
  eleventyConfig.addFilter("firstChar", (str) => (str || "").charAt(0));
  eleventyConfig.addFilter("restChars", (str) => (str || "").slice(1));
  eleventyConfig.addFilter("splitParagraphs", (str) => (str || "").split("\n\n"));
  eleventyConfig.addFilter("splitPipe", (str) => (str || "").split("|"));

  // Фарматаванне даты ў беларускім стылі: "25 чэрвеня 2026"
  const belarusianMonths = [
    "студзеня", "лютага", "сакавіка", "красавіка", "мая", "чэрвеня",
    "ліпеня", "жніўня", "верасня", "кастрычніка", "лістапада", "снежня",
  ];
  eleventyConfig.addFilter("readableDate", (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getUTCDate()} ${belarusianMonths[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });

  // Кароткая дата (дзень.месяц.год) для аб'яваў
  eleventyConfig.addFilter("shortDate", (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${d.getUTCFullYear()}`;
  });

  // Раскладвае courses[] аднаго дня на 5 слотаў з значэннямі для I/II/III курса
  // ў фіксаваным парадку — каб у шаблоне можна было прайсціся loop.index
  // і паставіць правільны data-course.
  eleventyConfig.addFilter("scheduleSlots", (courses) => {
    const slotKeys = ["slot1", "slot2", "slot3", "slot4", "slot5"];
    const slotTimes = ["09:00–10:30", "10:45–12:15", "12:30–14:00", "14:15–15:45", "16:00–17:30"];
    const courseNames = ["I курс", "II курс", "III курс"];
    return slotKeys.map((key, i) => ({
      time: slotTimes[i],
      values: courseNames.map((cn) => {
        const found = (courses || []).find((c) => c.course === cn);
        return found && found[key] ? found[key] : "";
      }),
    }));
  });

  // Бібліятэка: аддзяляе агульныя матэрыялы ад прадметных і групуе
  // прадметныя па назве прадмета (і па падкатэгорыі ўнутры прадмета).
  eleventyConfig.addFilter("libraryGeneral", (items) =>
    (items || []).filter((i) => i.data.category === "general").map((i) => i.data)
  );
  eleventyConfig.addFilter("libraryBySubject", (items) => {
    const groups = {};
    (items || []).forEach((i) => {
      if (i.data.category !== "subject") return;
      const subj = i.data.subject || "Без назвы";
      if (!groups[subj]) groups[subj] = { plain: [], subcats: {} };
      if (i.data.subcategory) {
        if (!groups[subj].subcats[i.data.subcategory]) groups[subj].subcats[i.data.subcategory] = [];
        groups[subj].subcats[i.data.subcategory].push(i.data);
      } else {
        groups[subj].plain.push(i.data);
      }
    });
    return groups;
  });

  // Лік ключоў звычайнага JS-аб'екта (не масіва) — для праверкі "ці пуста".
  eleventyConfig.addFilter("objectKeysCount", (obj) => Object.keys(obj || {}).length);

  // "II курс" -> "2", для атрыбута data-course
  eleventyConfig.addFilter("courseTagToNumber", (tag) => {
    const map = { "I курс": "1", "II курс": "2", "III курс": "3" };
    return map[tag] || "";
  });

  // Статычныя файлы, якія Eleventy павінна проста скапіяваць у вывад
  // без апрацоўкі (CSS, малюнкі для CMS, увесь раздзел admin/)
  eleventyConfig.addPassthroughCopy({ "styles.css": "styles.css" });
  eleventyConfig.addPassthroughCopy({ "admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "images": "images" });
  eleventyConfig.addPassthroughCopy({ "robots.txt": "robots.txt" });

  // Сцяг для часовага закрыцця сайта (юрыдычныя пытанні з рэгістрацыяй).
  // Калі true — на ўсе старонкі дадаецца <meta name="robots" content="noindex, nofollow">.
  // Пасля вырашэння пытання проста пастаўце false і перазалейце сайт.
  eleventyConfig.addGlobalData("siteClosed", () => true);

  // Калекцыі — групы файлаў з content/, якія можна перабіраць у шаблонах
  // праз {% for teacher in collections.teachers %} і г.д.
  eleventyConfig.addCollection("teachers", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("content/teachers/*.md")
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
  });

  eleventyConfig.addCollection("news", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("content/news/*.md")
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date)); // новыя першыя
  });

  eleventyConfig.addCollection("schedule", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("content/students/schedule/*.md")
      .sort((a, b) => new Date(a.data.date) - new Date(b.data.date)); // храналагічна
  });

  eleventyConfig.addCollection("announcements", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("content/students/announcements/*.md")
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
  });

  eleventyConfig.addCollection("library", (collectionApi) => {
    return collectionApi.getFilteredByGlob("content/students/library/*.md");
  });

  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    // Файлы content/*.md ужо ў фармаце markdown + frontmatter —
    // Eleventy будзе апрацоўваць іх як звычайныя старонкі
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
