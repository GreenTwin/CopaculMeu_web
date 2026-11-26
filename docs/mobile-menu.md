# Mobile menu

Phones get one menu button. Tablets and desktops keep the header and the three map buttons where they are today.

A phone is a viewport narrower than 768px. 768px and wider is a tablet or a desktop. The existing header and map controls stay in place at those widths, including the layout rules that already apply at 768px.

## What will change

- On a phone the header bar is hidden. A single floating burger button sits at the top right. Add tree and Needs Water stay on the map, centered along the bottom, so they can be used without opening the menu.
- On a phone the zoom buttons are hidden. Pinching the map still zooms. At 768px and wider the zoom buttons stay at the bottom right.
- Opening it slides a solid drawer in from the right. Search sits under the title. The actions are grouped into Map, Account, and Preferences. Needs Water shows an on/off switch. Language shows the current choice beside its label.
- `src/components/MapControls.tsx` hides the bottom bar on phones. Needs Water, Where am I, and Legend move into the same menu. The legend card itself stays the card that already exists.
- `src/App.tsx` owns whether the menu is open, so the header button and the map actions share one panel.
- `src/styles/components.css` draws the panel and hides the moved controls only under 768px.
- `src/i18n/translations.ts` adds the menu button label in Romanian and English.

Opening Settings, Legend, Propose Tree, or Sign In closes the menu and opens that surface. Needs Water and Where am I keep their current on and off state inside the menu. Escape, a tap outside the panel, and a second tap on the menu button close it.

## Acceptance criteria

- At 390px the map shows the floating menu button, plus Add tree and Needs Water along the bottom. The zoom buttons are hidden, and pinching the map still zooms. Search, Propose Tree, Sign In, language, theme, Settings, and the three map actions appear when the drawer slides in from the right.
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
