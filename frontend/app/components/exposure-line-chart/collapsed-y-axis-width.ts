// Recharts reserves offset.left based on this width, so shrinking it (not hiding via CSS) is
// what widens the plot area. CollapsedYAxisTick draws the tick text at its own fixed x instead,
// since the default position is derived from this width and would otherwise land off-screen.
export const COLLAPSED_Y_AXIS_WIDTH = 4;

// CollapsedYAxisTick centers each label on its gridline, so the top one needs this much room above the plot
export const COLLAPSED_Y_AXIS_TOP_MARGIN = 12;
