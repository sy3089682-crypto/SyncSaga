import Link from 'next/link'

export const metadata = { title: 'Pricing — SyncSaga' }

const plans = [
  {
    name: 'Free', price: 0, badge: null,
    features: ['5 rooms/day', 'Up to 50 members', '7-day chat history', 'Standard themes', '3 daily quests'],
  },
  {
    name: 'Plus', price: 4.99, badge: '💎',
    features: ['Unlimited rooms', 'Up to 200 members', 'Unlimited history', 'All themes + 2 exclusive', '5 daily quests', 'Profile banner', 'Voice in rooms', 'Custom room backgrounds'],
  },
  {
    name: 'Pro', price: 9.99, badge: '⚡',
    features: ['Everything in Plus', 'Up to 500 members', 'Room analytics', 'Priority AI features', 'Custom room domain', 'API access', 'Early access'],
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <Link href="/dashboard" className="text-[#00d4ff] font-black text-xl">SyncSaga</Link>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-3">Simple Pricing</h1>
          <p className="text-[#444]">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`border p-6 ${
              plan.name === 'Plus' ? 'border-[#00d4ff] bg-[#00d4ff]/5' : 'border-[#1a1a1a] bg-[#111]'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                {plan.badge && <span className="text-xl">{plan.badge}</span>}
                <h2 className="text-xl font-black">{plan.name}</h2>
                {plan.name === 'Plus' && <span className="text-xs bg-[#00d4ff] text-black px-2 py-0.5 font-bold">POPULAR</span>}
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black">${plan.price}</span>
                {plan.price > 0 && <span className="text-[#444] text-sm">/month</span>}
              </div>
              <ul className="space-y-2 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="text-[#00d4ff]">✓</span>
                    <span className="text-[#888]">{f}</span>
                  </li>
                ))}
              </ul>
              {plan.price === 0
                ? <Link href="/auth/register" className="block text-center border border-[#1a1a1a] text-white py-3 font-bold hover:border-[#333] transition-colors">Get Started Free</Link>
                : <Link href={`/api/stripe/create-checkout?plan=${plan.name.toLowerCase()}`} className={`block text-center py-3 font-bold transition-colors ${
                    plan.name === 'Plus' ? 'bg-[#00d4ff] text-black hover:bg-[#00b8d9]' : 'bg-[#ff006e] text-white hover:bg-[#d4005c]'
                  }`}>Upgrade to {plan.name}</Link>
              }
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
