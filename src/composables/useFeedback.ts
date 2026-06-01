import { ref } from 'vue'

export function useFeedback() {
  const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

  function setSuccess(message: string) {
    feedback.value = { type: 'success', message }
  }

  function setError(error: unknown, fallback = 'Something went wrong.') {
    feedback.value = {
      type: 'error',
      message: error instanceof Error ? error.message : fallback,
    }
  }

  function clearFeedback() {
    feedback.value = null
  }

  return { feedback, setSuccess, setError, clearFeedback }
}
