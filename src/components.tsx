
export function Only({ if: predicate, children }) {
  return predicate ? children : null;
}