## 2024-06-25 - React Form State vs Large List Re-rendering
**Learning:** In a live chat implementation (`ChatPanel`), holding the uncontrolled input text state in the top-level parent component means that typing literally anything triggers an immediate re-render of the entire chat history. This causes an unexpected O(N) performance cliff as chat histories grow.
**Action:** Always decouple fast-updating primitive state (like text input fields or sliders) into isolated child components and use `React.memo` along with `useCallback` on the prop event handler to prevent expensive sibling renders.
