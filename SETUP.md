# Snally Hoard: backend setup (about 15 minutes)

The app keeps its data in a Google Sheet that you own. A small script attached to
the sheet (Google Apps Script) acts as the "server" that everyone's phones talk to.
You need no servers, no money and no coding. You will copy, paste and click.

You need:
- A Google account (a normal Gmail account is fine).
- A computer with a web browser. Doing this on a phone is painful.
- The file `backend/Code.gs` from the repo (<https://github.com/xuhanwen97/SnallyTracker/blob/main/backend/Code.gs>),
  opened so you can copy all of it.

---

## Step 1: Create the Google Sheet

1. Go to <https://sheets.google.com>.
2. Click the big **+ Blank spreadsheet** tile.
3. Click the title **Untitled spreadsheet** (top left) and type **Snally Hoard 2026**, then press Enter.

## Step 2: Open the script editor

1. In the sheet's menu bar, click **Extensions → Apps Script**.
2. A new browser tab opens with a code editor showing a file called **Code.gs**,
   which contains `function myFunction() { }`.
3. Click the project name **Untitled project** (top left) and rename it to **Snally Hoard**. Click **Rename**.

## Step 3: Paste the code

1. Click inside the editor, select everything (**Ctrl+A**, or **Cmd+A** on a Mac) and press **Delete**. The file should now be empty.
2. Open `backend/Code.gs` from the repo, select all of it and copy it. (On GitHub, the **Copy raw file** button
   above the code copies the whole file.)
3. Paste it into the empty editor.
4. Click the **Save** icon (the floppy disk) or press **Ctrl+S** / **Cmd+S**.

## Step 4: Run `setup` once (and get through Google's warning screens)

`setup` creates the tabs (**Drinkers**, **Beers**, **Pours**), downloads the beer list into **Beers**, and sets the starting admin PIN.

1. At the top of the editor there is a toolbar with a **Run** button and a dropdown next to it showing a function name. Click the dropdown and choose **setup**.
2. Click **▶ Run**.
3. An **Authorization required** box appears. Click **Review permissions**.
4. Choose your Google account.
5. You will probably see a scary screen: **"Google hasn't verified this app"**.
   This is normal. You wrote this script yourself (well, pasted it), and Google
   shows this warning for every personal script that hasn't gone through their review.
   - Click **Advanced** (small link, bottom left).
   - Click **Go to Snally Hoard (unsafe)**.
6. The next screen lists what the script may do: see and edit the spreadsheet,
   connect to an external service (to download the beer list), and so on. Click **Allow**.
   If it shows checkboxes, tick **Select all** first.
7. The **Execution log** at the bottom should finish with something like
   `Snally setup done. Loaded 540 beers.`
8. Go back to the sheet's browser tab. You should see the new tabs at the bottom:
   **Drinkers**, **Beers** (about 540 rows) and **Pours** (only the header row).
   You can delete the empty **Sheet1** tab: right-click it, then **Delete**.

If the log shows `Could not download the beer list (HTTP 404)`, the beer list
isn't reachable at
<https://raw.githubusercontent.com/xuhanwen97/SnallyTracker/main/beers.json>
(it must be pushed to `main`, and the repo must be public). Fix that, then run **setup** again.

## Step 5: Change the admin PIN

The organizer PIN starts as `snally`. Anyone who knows it can add drinkers,
delete pours and reset the leaderboard, so change it now.

1. In the Apps Script tab, click the **⚙ gear icon (Project Settings)** in the left sidebar.
2. Scroll to the bottom, to **Script Properties**, and click **Edit script properties**.
3. You'll see `ADMIN_PIN` with the value `snally`. Replace the value with your own PIN
   (letters or numbers, something you can type on a phone at a festival).
4. Click **Save script properties**.

Leave the `DATA_VERSION` property alone. The script uses it internally.

## Step 6: Add the drinkers

1. In the sheet, open the **Drinkers** tab.
2. Type one name per row under the **Name** header: A2, A3, A4, and so on.
   Use the names people will recognize on the leaderboard (for example `Hanwen`, `Sam`).
3. You can add more names any time: here in the sheet, or from the app's organizer
   screen using the PIN. New names show up on phones within a few seconds.

People pick their name from this list in the app. They don't need logins.

## Step 7: Publish it as a web app

1. In the Apps Script tab, click the blue **Deploy** button (top right), then **New deployment**.
2. Next to **Select type**, click the **⚙ gear** and choose **Web app**.
3. Fill in:
   - **Description**: `Snally v1` (anything you like)
   - **Execute as**: **Me (your email)**
   - **Who has access**: **Anyone**. Be careful: choose **Anyone**, not "Anyone with Google account".
     Otherwise friends would have to log in and the app would break.
4. Click **Deploy**. If it asks you to authorize again, repeat the clicks from Step 4.
5. You'll see a **Web app URL** ending in **`/exec`**, like
   `https://script.google.com/macros/s/AKfy..../exec`. Click **Copy**.
6. **Paste that URL to Claude.** It goes into `config.js` as `API_URL`. Once that's pushed, the app at
   <https://xuhanwen97.github.io/SnallyTracker/> talks to your sheet.

Check that it works: paste the URL into a new browser tab and add `?action=state`
to the end. You should see something like
`{"ok":true,"serverTime":"...","drinkers":["Hanwen","Sam"],"pours":[]}`.

---

## After you change Code.gs: publish a new version

Saving the code is **not** enough. The web app keeps running the old version until you republish it:

1. **Deploy → Manage deployments**.
2. Select your deployment (`Snally v1`) and click the **✏ pencil (Edit)** icon.
3. Under **Version**, choose **New version**.
4. Click **Deploy**.

The URL stays the same, so you don't need to change anything in the app.
(Don't use "New deployment" for updates, because that creates a **different** URL.)

---

## The "Snally" menu in the sheet

After setup, reload the sheet tab. A **Snally** menu appears to the right of **Help**.
If Google asks you to authorize when you first use it, repeat the clicks from Step 4.

- **Setup / reload beers** re-creates any missing tabs and re-downloads the beer list
  into the **Beers** tab, replacing what's there. Use it if the beer list gets updated.
  This doesn't touch pours or drinkers.
- **Back up & reset pours** copies the **Pours** tab into a new tab named
  `Pours backup <date time>`, then empties **Pours** (it keeps the header row).
  Everyone's totals go back to zero. Use it after a test run, before the festival starts.

## Saving the data

- The **Back up & reset pours** menu item keeps a copy of the pours tab each time you use it.
- For a full snapshot of everything: **File → Make a copy** in the sheet. The copy is a frozen
  snapshot. The app keeps writing to the original.
- To get a file: **File → Download → Microsoft Excel (.xlsx)** or **CSV** (CSV saves the current tab only).

## Fixing a bad row

Every logged drink is one row in the **Pours** tab.

- **To remove a pour:** change its **deleted** cell (last column) to `TRUE`. It disappears from
  the leaderboard within a few seconds but stays in the sheet for the record. To undo, set it back to `FALSE`.
  (Drinkers can also undo their own pour from the app within 10 minutes, and the organizer can
  delete any pour from the app with the PIN.)
- **To correct a value** (wrong drinker name, wrong ABV, wrong size): just edit the cell. Keep
  `drinker` spelled exactly as in the **Drinkers** tab. `oz` is the number of ounces
  (small = 2, standard = 4, brim = 5.5). `abv` is a percent number like `6.5`.
- **Don't** rename or reorder the header row (row 1) of any tab, and don't delete the
  `id` column. The app relies on them.
- To remove a drinker, delete their row in **Drinkers**. Their old pours stay in **Pours**
  (set those to deleted `TRUE` if you want them gone from the leaderboard).

## Troubleshooting

| Symptom | Fix |
|---|---|
| App says "Wrong PIN" | Check `ADMIN_PIN` in Project Settings → Script Properties. |
| App says "Unknown drinker" | The name isn't in the **Drinkers** tab (check the spelling). |
| Code changes don't take effect | You must publish a new version (see above). |
| Opening the URL asks for a Google login | The deployment's **Who has access** isn't **Anyone**. Edit it under Manage deployments. |
| "Server busy" | Lots of people logged a drink at once. Tap again. |
