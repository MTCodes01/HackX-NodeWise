import Industries from '../components/Industries'
import CTA from '../components/CTA'
import PageTransition from '../components/PageTransition'

export default function Solutions() {
  return (
    <PageTransition>
      <div style={{ paddingTop: '5rem' }}>
        <Industries />
        <CTA />
      </div>
    </PageTransition>
  )
}
