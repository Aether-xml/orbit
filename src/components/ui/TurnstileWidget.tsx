import { Turnstile } from '@marsidev/react-turnstile'

type Props = {
  onSuccess: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

export default function TurnstileWidget({ onSuccess, onExpire, onError }: Props) {
  return (
    <Turnstile
      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY as string}
      onSuccess={onSuccess}
      onExpire={onExpire}
      onError={onError}
      options={{ theme: 'dark', size: 'flexible', language: 'tr' }}
    />
  )
}
