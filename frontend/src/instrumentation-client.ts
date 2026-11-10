// Some browser extensions annotate server-rendered elements before React starts.
// Next.js runs this synchronous hook before hydration, so restore only those
// known development-only annotations instead of suppressing hydration warnings.
if (process.env.NODE_ENV === "development") {
  for (const element of document.querySelectorAll(
    "body, [bis_skin_checked], [bis_register]",
  )) {
    element.removeAttribute("bis_skin_checked");
    element.removeAttribute("bis_register");

    if (element === document.body) {
      for (const attribute of Array.from(element.attributes)) {
        if (
          /^__processed_[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}__$/i.test(
            attribute.name,
          )
        ) {
          element.removeAttribute(attribute.name);
        }
      }
    }
  }
}
