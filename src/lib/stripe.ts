import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  console.warn('Stripe publishable key eksik.')
}

export const stripePromise = loadStripe(stripePublishableKey ?? '')

export const redirectToCheckout = async (priceId: string, userId: string) => {
  const stripe = await stripePromise
  if (!stripe) throw new Error('Stripe yüklenemedi.')

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    successUrl: `${import.meta.env.VITE_APP_URL}/nova-plus?success=true`,
    cancelUrl: `${import.meta.env.VITE_APP_URL}/nova-plus?cancelled=true`,
    clientReferenceId: userId,
  })

  if (error) throw error
}