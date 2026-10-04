# Year 3 Spelling Test

A small web page that reads spelling words aloud, in a random order, so a child can practise a spelling test at home. Each word is read twice, then there's a pause to write it down. An answer key in the same order appears at the bottom.

It works on phones, tablets and computers, in light or dark mode.

## Files

| File | What it does |
|---|---|
| `index.html` | The page layout |
| `styles.css` | How the page looks |
| `app.js` | The word lists, the voice and the test itself |

Keep all three files in the same folder.

## How to open it

- **On a computer:** double-click `index.html`, or drag it into a browser.
- **On a phone or tablet:** put the folder on a website, such as GitHub Pages or Netlify (both free), and open the link.

The in-app preview in the Claude desktop app doesn't load `styles.css` and `app.js`, so the page looks unstyled there. Opening it in a normal browser works fine.

## How to use it

1. **Choose the words:**
   - Tick one or more weeks under **Preset word lists**.
   - Choose **Spelling words**, **Common exception words** or both.
   - Press **Load (replace)** to replace the list, or **Add to my list** to add to it.
   - You can also type your own words in **Your words**, one per line or separated by commas. The list is saved in the browser.
2. **Set it up (optional):**
   - **How many words:** leave it empty to test every word in the list.
   - **Gap between words:** 7 seconds unless you change it.
   - **Voice** and **Speed**.
3. **Press Start test.** Press **Stop** at any time.
4. When it's finished, check the child's spellings against the **Answer key**.

## The voice

The page uses the **Google British voice** unless you pick another one. It's the free voice from Google Translate, so it sounds the same on every device. It needs an internet connection.

- If Google can't be reached, the page uses the device's own voice for that word and shows a short note, so the test carries on.
- You can also pick one of the device's voices from the list to use it offline. The page remembers your choice.
- The Google voice isn't an official Google service for websites, so Google could change or block it at any time. If that happens, the device voices still work.

## Adding a new week

Open `app.js` and add an entry to the `WEEKS` list:

```js
{
  name: "Week 7 (test 26/10)",
  spelling: "word1, word2, word3",
  exception: "word4, word5",
},
```

A **Week 7** chip appears on the page automatically.
