import { FormEvent } from 'react'
import { useAppStore } from '../store/useAppStore'

export function AddressBar() {
  const { state, setDraftUrl, navigate } = useAppStore()

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    navigate()
  }

  return (
    <form className="address-form" onSubmit={onSubmit}>
      <input
        className="address-input"
        value={state.draftUrl}
        onChange={(event) => setDraftUrl(event.target.value)}
        placeholder="Escribe una URL"
        spellCheck={false}
        aria-label="Barra de dirección"
      />
    </form>
  )
}
