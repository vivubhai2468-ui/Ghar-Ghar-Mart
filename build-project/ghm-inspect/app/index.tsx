import { Redirect } from "expo-router";

/**
 * Mount the branded splash route first so the native splash can be dismissed
 * after the intentional welcome hold and auth bootstrap complete.
 */
export default function IndexRoute() {
  return <Redirect href="/splash" />;
}
