/** What a widget shows: a few numbers of a service, read from its API by the server. */

/** One number of a widget, formatted on the server: "1,284" and "documents". */
export type Stat = {
  value: string;
  label: string;
};

/** The numbers, or why there are none. */
export type WidgetResult = { stats: Stat[] } | { error: string };

/** The widgets of a round, by service name. A service without a widget has none. */
export type Widgets = Record<string, WidgetResult>;
