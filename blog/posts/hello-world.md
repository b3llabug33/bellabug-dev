welcome to the blog part of the site. i finally wired it up so i can drop
posts here without hand-writing a whole html page every time.

## how it works

each post is one markdown file in `blog/posts/`, plus one line in
`blog/posts.json` so it shows up in the list. that's the whole workflow:

1. write `blog/posts/my-post.md`
2. add an entry to `blog/posts.json` (slug, title, date, excerpt)
3. push

markdown i can use in here: headings, **bold**, _italic_, `inline code`,
[links](https://github.com/b3llabug33), lists, quotes, images, and fenced
code blocks like:

```
git add .
git commit -m "new post"
git push
```

> the renderer is a tiny hand-rolled thing in `blog/blog.js` — no build
> step, no libraries, same as the rest of the site.

## what i want to put here

devlog-ish stuff mostly. progress on projects, things i learned the hard
way, screenshots of bugs (the software kind and the real kind).

more soon.
