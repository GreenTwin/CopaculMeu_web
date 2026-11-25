# Mobile menu

Phones get one menu button. Tablets and desktops keep the header and the three map buttons where they are today.

A phone is a viewport narrower than 768px. 768px and wider is a tablet or a desktop. The existing header and map controls stay in place at those widths, including the layout rules that already apply at 768px.

## What will change

- `src/components/Header.tsx` shows a menu button on phones, after the search field. The button is the standard three-line icon and has an accessible name.
- On phones the header keeps the name, the search field, Propose Tree, and Sign In (or the signed-in account). Language, theme, and Settings move into the menu.
- `src/components/MapControls.tsx` hides the bottom bar on phones. Needs Water, Where am I, and Legend move into the same menu. The legend card itself stays the card that already exists.
- `src/App.tsx` owns whether the menu is open, so the header button and the map actions share one panel.
- `src/styles/components.css` draws the panel and hides the moved controls only under 768px.
- `src/i18n/translations.ts` adds the menu button label in Romanian and English.

Opening Settings, Legend, Propose Tree, or Sign In closes the menu and opens that surface. Needs Water and Where am I keep their current on and off state inside the menu. Escape, a tap outside the panel, and a second tap on the menu button close it.

## Acceptance criteria

- At 390px the header shows the name, search, Propose Tree, Sign In, and the menu button. Language, theme, Settings, and the three bottom buttons are not on the map until the menu is open.
- Opening the menu shows language, theme, Settings, Needs Water, Where am I, and Legend. Each one still does what it does today.
- At 768px and at 1280px there is no menu button. Language, theme, Settings, and the three bottom buttons stay where they are now.
- The menu closes on Escape, on an outside tap, and when Settings or Legend opens.

## Unit tests

`src/utils/viewport.ts` decides the layout from a width. Vitest covers it without a browser.

- `isPhoneLayout_below768_isTrue` for 390 and 767.
- `isPhoneLayout_768AndWider_isFalse` for 768 and 1280.

## Playwright

`e2e/mobile-menu.spec.ts` sets the viewport on the page. The existing desktop project stays as it is.

- At 390×844, the menu button is visible, the bottom bar is absent, and opening the menu shows Settings and Legend.
- At 1024×768, the menu button is absent, and Needs Water, Where am I, and Legend stay on the map.
