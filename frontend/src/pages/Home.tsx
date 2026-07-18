import Hero from '../components/Hero'
import TrustedBy from '../components/TrustedBy'
import Problem from '../components/Problem'
import Solution from '../components/Solution'
import WhyOptimus from '../components/WhyOptimus'
import CTA from '../components/CTA'
import PageTransition from '../components/PageTransition'

export default function Home() {
  return (
    <PageTransition>
      <Hero />
      <TrustedBy />
      <Problem />
      <Solution />
      <WhyOptimus />
      <CTA />
    </PageTransition>
  )
}
