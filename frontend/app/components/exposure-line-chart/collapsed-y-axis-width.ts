// Recharts reserves offset.left based on this width, so shrinking it (not hiding via CSS) is
// what widens the plot area. CollapsedYAxisTick draws the tick text at its own fixed x instead,
// since the default position is derived from this width and would otherwise land off-screen.
export const COLLAPSED_Y_AXIS_WIDTH = 4;
