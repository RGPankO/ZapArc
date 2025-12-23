// Debounce utility functions

export const PIN_AUTO_CONFIRM_DELAY_MS = 300;

/**
 * Creates a debounced version of a function
 * @param fn Function to debounce
 * @param delayMs Delay in milliseconds
 * @returns Object with `call` method to invoke debounced function and `cancel` to clear pending call
 */
export function createDebounce<T extends (...args: any[]) => void>(fn: T, delayMs: number) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return {
        call: (...args: Parameters<T>) => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                fn(...args);
                timeoutId = null;
            }, delayMs);
        },
        cancel: () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        }
    };
}
