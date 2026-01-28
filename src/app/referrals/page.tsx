import { listSessions } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { UserCheck, Calendar, Clock, ArrowRight } from 'lucide-react';
import { getIntake, getReferrals } from '@/lib/db';

export default async function ReferralsPage() {
  const sessions = await listSessions();
  
  // Filter sessions that have intakes (screening completed)
  const sessionsWithIntakes = await Promise.all(
    sessions.map(async (session) => {
      const intake = await getIntake(session.id);
      const referrals = intake ? await getReferrals(session.id) : [];
      return { session, intake, referrals };
    })
  );

  const sessionsWithReferrals = sessionsWithIntakes.filter(
    (item) => item.intake && item.referrals.length > 0
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
        <p className="text-muted-foreground mt-2">
          View your specialist referrals and booking options
        </p>
      </div>

      {sessionsWithReferrals.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="h-12 w-12" />}
          title="No referrals yet"
          description="Complete a screening conversation to receive specialist referrals."
          action={{
            label: 'Browse Agents',
            href: '/agents',
          }}
        />
      ) : (
        <div className="space-y-4">
          {sessionsWithReferrals.map(({ session, intake, referrals }) => (
            <Card key={session.id} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {intake?.reason_for_visit || 'Screening Session'}
                    </CardTitle>
                    <CardDescription>
                      {session.agent?.name || 'Unknown Agent'} • {formatDate(session.started_at)}
                    </CardDescription>
                  </div>
                  <Badge variant="success">
                    {referrals.length} {referrals.length === 1 ? 'referral' : 'referrals'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Recommended: {intake?.recommended_specialty || 'Specialist'}
                    </p>
                    {intake?.location_city && intake?.location_state && (
                      <p className="text-sm text-muted-foreground">
                        Location: {intake.location_city}, {intake.location_state}
                      </p>
                    )}
                  </div>
                  <Button asChild variant="default">
                    <Link href={`/referrals/${session.id}`}>
                      View Referrals
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
