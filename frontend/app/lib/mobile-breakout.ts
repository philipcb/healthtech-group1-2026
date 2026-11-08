// left-1/2 + -50vw margin cancels out layout.tsx's mx-5 regardless of nesting depth. Below lg it has no border or
// corners, so the chart sits straight on the page, like in a stock app.
export const MOBILE_BREAKOUT_CARD_CLASSNAME =
	"left-1/2 -ml-[50vw] w-screen rounded-none border-0 lg:left-auto lg:ml-0 lg:w-full lg:rounded-xl lg:border";
