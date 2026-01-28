import { getSessionDetail, getIntake, getReferrals } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReferralCard } from '@/components/ReferralCard';
import Link from 'next/link';
import { ArrowLeft, Shield, Print } from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function OnlineSummaryPage({ params }: PageProps) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header - Minimal for print */}
      <div className="space-y-4 print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/referrals/${sessionId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.print();
              }
            }}
          >
            <Print className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2 pb-8 border-b">
        <h1 className="text-3xl font-bold tracking-tight">Your Referral Summary</h1>
        <p className="text-muted-foreground">
          Generated on {formatDate(new Date().toISOString())}
        </p>
      </div>

      {/* What You Shared */}
      {intake && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">What You Shared</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {intake.reason_for_visit && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Reason for Visit
                </div>
                <p className="text-base leading-relaxed">{intake.reason_for_visit}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
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

            {intake.recommended_specialty && (
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Recommended Specialty
                </div>
                <div className="text-base font-medium capitalize">
                  {intake.recommended_specialty}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provider Options */}
      {referrals.length > 0 ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Provider Options</h2>
            <p className="text-muted-foreground">
              Based on your screening, here are the specialists we recommend:
            </p>
          </div>

          <div className="space-y-6">
            {referrals.map((referral, index) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                isBestMatch={index === 0}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-center text-sm">
              No referrals available yet. We're still searching for specialists matching your needs.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Important Notes */}
      <Card className="print:break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-lg">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info" className="border-l-4">
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>This is not medical advice.</strong> This information is for screening and
              referral purposes only. It does not constitute medical advice, diagnosis, or treatment.
              Please consult with a qualified healthcare provider for any medical concerns.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Next Steps:</strong> Review the provider options above and book an appointment
              directly through Zocdoc using the booking links provided.
            </p>
            <p>
              <strong>Questions?</strong> If you have questions about your referral or need to update
              your information, please contact us.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer - Hidden in print */}
      <div className="text-center text-sm text-muted-foreground pt-8 border-t print:hidden">
        <p>This summary matches the email sent to {intake?.user_email || 'your email'}.</p>
        <p className="mt-2">
          <Link href={`/referrals/${sessionId}`} className="text-primary hover:underline">
            View interactive referral page
          </Link>
        </p>
      </div>
    </div>
  );
}
