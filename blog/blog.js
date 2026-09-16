/* =============================================================================
   bellabug.dev blog — shared script

   No build step, no libraries. Two jobs:
     1. render blog/posts.json into the post list on blog.html
     2. render a single blog/posts/<slug>.md into blog-post.html

   Posts are written in a small subset of Markdown (see mdToHtml below):
   headings, bold/italic, inline + fenced code, links, images, blockquotes,
   ordered + unordered lists, horizontal rules, paragraphs.
   ========================================================================== */

(function () {
  "use strict";

  /* ---- html escaping -----------------------------------------------------
     everything user-authored is escaped before any markdown markup is turned
     back into real tags, so a post can't inject arbitrary html. ">" is left
     alone on purpose: it can't open a tag by itself, and blockquote
     detection still needs to see it. */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  /* only let through link/image targets we're comfortable rendering */
  function safeUrl(u) {
    u = (u || "").trim();
    if (/^\s*javascript:/i.test(u)) return "#";
    if (/^(https?:|mailto:|#|\/|\.{0,2}\/|[a-z0-9._~-]+(\/|\.[a-z]{2,}|$))/i.test(u)) {
      return u;
    }
    return "#";
  }

  /* ---- inline markup (runs on already-escaped text) --------------------- */
  var RE_IMG   = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  var RE_LINK  = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  var RE_BOLD  = /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1/g;
  // italic: single * or _ ; the delimiters must sit at word boundaries so
  // snake_case names and "a * b" style text don't turn italic.
  var RE_EM    = /(^|[\s(\["'>])([*_])(?=\S)([^*_\n]+?)(?<=\S)\2(?=$|[\s)\].,!?:;"'<])/g;

  function inline(text) {
    // split on inline `code` spans (they land at odd indices) so markdown
    // markup inside them is never processed
    return text.split(/(`[^`]+`)/).map(function (seg, idx) {
      if (idx % 2 === 1) return "<code>" + seg.slice(1, -1) + "</code>";
      return seg
        .replace(RE_IMG, function (_, alt, src) {
          return '<img alt="' + alt + '" src="' + safeUrl(src) + '">';
        })
        .replace(RE_LINK, function (_, txt, url) {
          return '<a href="' + safeUrl(url) +
                 '" target="_blank" rel="noopener">' + txt + "</a>";
        })
        .replace(RE_BOLD, "<strong>$2</strong>")
        .replace(RE_EM, "$1<em>$3</em>");
    }).join("");
  }

  /* ---- block-level parser ----------------------------------------------
     line-by-line; predictable for a personal blog rather than a full
     CommonMark implementation. */
  function mdToHtml(md) {
    var lines = esc(md.replace(/\r\n?/g, "\n")).split("\n");
    var out = [];
    var para = [];
    var i = 0;

    function flush() {
      if (para.length) out.push("<p>" + inline(para.join(" ")) + "</p>");
      para.length = 0;
    }

    while (i < lines.length) {
      var line = lines[i];

      // fenced code block:  ```
      if (/^```/.test(line)) {
        flush();
        var code = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
        i++;
        out.push("<pre><code>" + code.join("\n") + "</code></pre>");
        continue;
      }

      // horizontal rule:  --- or ***
      if (/^\s*([-*])(\s*\1){2,}\s*$/.test(line)) {
        flush();
        out.push("<hr>");
        i++;
        continue;
      }

      // heading:  # .. ####
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flush();
        out.push("<h" + h[1].length + ">" + inline(h[2].trim()) +
                 "</h" + h[1].length + ">");
        i++;
        continue;
      }

      // blockquote:  > ...
      if (/^\s*>\s?/.test(line)) {
        flush();
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + inline(quote.join(" ")) + "</blockquote>");
        continue;
      }

      // unordered list:  - item  /  * item
      if (/^\s*[-*]\s+/.test(line)) {
        flush();
        var ul = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          ul.push("<li>" + inline(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ul>" + ul.join("") + "</ul>");
        continue;
      }

      // ordered list:  1. item
      if (/^\s*\d+\.\s+/.test(line)) {
        flush();
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          ol.push("<li>" + inline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ol>" + ol.join("") + "</ol>");
        continue;
      }

      // blank line ends a paragraph
      if (/^\s*$/.test(line)) {
        flush();
        i++;
        continue;
      }

      para.push(line.trim());
      i++;
    }
    flush();
    return out.join("\n");
  }

  /* ---- functional pixel-art scrollbar ---------------------------------
     same idea as art.html: the window frame png has a decorative track
     baked in on the right; a real <div> thumb is driven by the scroll
     body's scrollTop. shared so both blog pages get it. */
  function attachScrollbar(body, track, thumb) {
    if (!body || !track || !thumb) return function () {};
    var MIN = 24;

    function update() {
      var trackH = track.clientHeight;
      var contentH = body.scrollHeight;
      var viewH = body.clientHeight;
      if (contentH <= viewH + 1) {
        thumb.style.display = "none";
        return;
      }
      thumb.style.display = "block";
      var thumbH = Math.max(MIN, trackH * (viewH / contentH));
      var maxTop = trackH - thumbH;
      thumb.style.height = thumbH + "px";
      thumb.style.top = (body.scrollTop / (contentH - viewH)) * maxTop + "px";
    }

    body.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
    update();

    var dragging = false, startY = 0, startTop = 0;
    thumb.addEventListener("mousedown", function (e) {
      dragging = true;
      startY = e.clientY;
      startTop = body.scrollTop;
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var room = track.clientHeight - thumb.offsetHeight;
      var scrollable = body.scrollHeight - body.clientHeight;
      if (room <= 0) return;
      body.scrollTop = startTop + (e.clientY - startY) * (scrollable / room);
    });
    window.addEventListener("mouseup", function () { dragging = false; });

    track.addEventListener("mousedown", function (e) {
      if (e.target === thumb) return;
      var rect = track.getBoundingClientRect();
      var thumbH = thumb.offsetHeight;
      var room = track.clientHeight - thumbH;
      if (room <= 0) return;
      var target = Math.min(Math.max(0, (e.clientY - rect.top) - thumbH / 2), room);
      body.scrollTop = (target / room) * (body.scrollHeight - body.clientHeight);
    });

    return update;
  }

  var SLUG_OK = /^[a-z0-9][a-z0-9-]*$/;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? MONTHS[+m[2] - 1] + " " + +m[3] + ", " + m[1] : (iso || "");
  }

  /* ---- page: blog.html (the list) ----------------------------------- */
  function renderList(listEl, refreshBar) {
    fetch("blog/posts.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        posts.sort(function (a, b) {
          return (b.date || "").localeCompare(a.date || "");
        });
        if (!posts.length) {
          listEl.innerHTML = '<p class="blog-empty">no posts yet !!</p>';
        } else {
          listEl.innerHTML = posts.map(function (p) {
            return '<a class="post-card" href="blog-post.html?slug=' +
              encodeURIComponent(p.slug) + '">' +
              (p.image
                ? '<img class="post-card-thumb" src="' + esc(p.image) + '" alt="">'
                : "") +
              '<span class="post-card-date">' + esc(fmtDate(p.date)) + "</span>" +
              '<span class="post-card-title">' + esc(p.title || p.slug) + "</span>" +
              (p.excerpt
                ? '<span class="post-card-excerpt">' + esc(p.excerpt) + "</span>"
                : "") +
              "</a>";
          }).join("");
        }
        if (refreshBar) refreshBar();
      })
      .catch(function () {
        listEl.innerHTML = '<p class="blog-empty">couldn’t load posts.</p>';
      });
  }

  /* ---- page: blog-post.html (one post) ----------------------------- */
  function renderPost(els, refreshBar) {
    var slug = new URLSearchParams(location.search).get("slug") || "";

    function fail(msg) {
      els.title.textContent = "post not found";
      els.body.innerHTML = "<p>" + msg +
        ' <a href="blog.html">back to the blog</a>.</p>';
      if (refreshBar) refreshBar();
    }

    if (!SLUG_OK.test(slug)) {
      fail("that post doesn’t exist.");
      return;
    }

    fetch("blog/posts.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        var meta = posts.filter(function (p) { return p.slug === slug; })[0];
        if (meta) {
          document.title = meta.title + " — bellabug.dev";
          els.title.textContent = meta.title;
          if (els.date) els.date.textContent = fmtDate(meta.date);
        }
        return fetch("blog/posts/" + slug + ".md", { cache: "no-cache" });
      })
      .then(function (r) {
        if (!r.ok) throw new Error("missing");
        return r.text();
      })
      .then(function (md) {
        els.body.innerHTML = mdToHtml(md);
        // the page already prints the title/date from posts.json, so drop a
        // leading <h1> if the .md file repeats it
        var first = els.body.firstElementChild;
        if (first && first.tagName === "H1") first.remove();
        if (refreshBar) refreshBar();
      })
      .catch(function () { fail("couldn’t load that post."); });
  }

  /* ---- widget: last N posts, used on index.html under the intro ----- */
  function renderRecent(el, count) {
    fetch("blog/posts.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (posts) {
        posts.sort(function (a, b) {
          return (b.date || "").localeCompare(a.date || "");
        });
        var recent = posts.slice(0, count);
        if (!recent.length) {
          el.innerHTML = '<p class="recent-empty">no posts yet !!</p>';
          return;
        }
        el.innerHTML = recent.map(function (p) {
          return '<a class="recent-post" href="blog-post.html?slug=' +
            encodeURIComponent(p.slug) + '">' +
            (p.image
              ? '<img class="recent-post-thumb" src="' + esc(p.image) + '" alt="">'
              : "") +
            '<span class="recent-post-text">' +
            '<span class="recent-post-date">' + esc(fmtDate(p.date)) + "</span>" +
            '<span class="recent-post-title">' + esc(p.title || p.slug) + "</span>" +
            "</span></a>";
        }).join("");
      })
      .catch(function () {
        el.innerHTML = '<p class="recent-empty">couldn’t load posts.</p>';
      });
  }

  window.bellabugBlog = {
    mdToHtml: mdToHtml,
    attachScrollbar: attachScrollbar,
    renderList: renderList,
    renderPost: renderPost,
    renderRecent: renderRecent
  };
})();
