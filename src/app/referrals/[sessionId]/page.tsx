import { getSessionDetail, getIntake, getReferrals } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReferralCard } from '@/components/ReferralCard';
import Link from 'next/link';
import { ArrowLeft, Clock, Shield } from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ReferralResultsPage({ params }: PageProps) {
  const { sessionId } = await params;

  let session, intake, referrals;
  try {
    [session, intake, referrals] = await Promise.all([
      getSessionDetail(sessionId).then((d) => d.session),
      getIntake(sessionId),
      getReferrals(sessionId),
    ]);
  } catch (error) {
    notFound();
  }


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/referrals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Referrals
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recommended Specialists</h1>
          <p className="text-muted-foreground mt-2">
            Based on what you shared during your screening
          </p>
        </div>
      </div>

      {/* Intake Summary Card */}
      {intake && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Screening Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {intake.reason_for_visit && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Reason for visit
                </div>
                <div className="text-base">{intake.reason_for_visit}</div>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
              {intake.location_city && intake.location_state && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Location
                  </div>
                  <div className="text-sm">
                    {intake.location_city}, {intake.location_state}
                    {intake.location_zip && ` ${intake.location_zip}`}
                  </div>
                </div>
              )}
              {intake.insurance_provider && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Insurance
                  </div>
                  <div className="text-sm">{intake.insurance_provider}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrals */}
      {referrals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Finding specialists for you</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm text-sm">
              We're searching for the best specialists matching your needs. We'll email you options shortly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {referrals.map((referral, index) => (
            <ReferralCard
              key={referral.id}
              referral={referral}
              isBestMatch={index === 0}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <Alert variant="info">
        <Shield className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Important:</strong> This information is for screening and referral purposes only.
          It does not constitute medical advice, diagnosis, or treatment. Please consult with a
          qualified healthcare provider for any medical concerns.
        </AlertDescription>
      </Alert>
    </div>
  );
}
