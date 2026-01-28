import { getSessionDetail, getIntake, getReferrals } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Shield, CheckCircle2, Clock } from 'lucide-react';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ScreeningSummaryPage({ params }: PageProps) {
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const started = formatDate(session.started_at);
  const startedTime = formatTime(session.started_at);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/sessions/${sessionId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Session
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Screening Summary</h1>
          <p className="text-muted-foreground mt-2">
            What we collected during your conversation
          </p>
        </div>
      </div>

      {/* Status & Timestamp */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <Badge variant={session.status === 'ended' ? 'success' : 'warning'}>
                {session.status === 'ended' ? 'Screening Complete' : 'In Progress'}
              </Badge>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Started</div>
              <div className="text-sm">
                {started} at {startedTime}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intake Information */}
      {intake ? (
        <div className="space-y-6">
          {/* Reason for Visit */}
          {intake.reason_for_visit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reason for Visit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed">{intake.reason_for_visit}</p>
                {intake.symptoms && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Symptoms
                    </div>
                    <p className="text-sm text-muted-foreground">{intake.symptoms}</p>
                  </div>
                )}
                {intake.duration && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Duration
                    </div>
                    <p className="text-sm text-muted-foreground">{intake.duration}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Facts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location */}
              {(intake.location_city || intake.location_zip) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Location
                    </div>
                    <div className="text-sm">
                      {intake.location_city && intake.location_state
                        ? `${intake.location_city}, ${intake.location_state}`
                        : intake.location_city || intake.location_state || ''}
                      {intake.location_zip && ` ${intake.location_zip}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Insurance */}
              {intake.insurance_provider && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Insurance
                    </div>
                    <div className="text-sm">
                      {intake.insurance_provider}
                      {intake.insurance_plan && ` - ${intake.insurance_plan}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Appointment Preference */}
              {intake.appointment_preference && intake.appointment_preference !== 'either' && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Appointment Preference
                    </div>
                    <div className="text-sm capitalize">
                      {intake.appointment_preference === 'in-person'
                        ? 'In-person'
                        : intake.appointment_preference === 'telehealth'
                        ? 'Telehealth'
                        : intake.appointment_preference}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommended Specialty */}
              {intake.recommended_specialty && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Recommended Specialty
                    </div>
                    <div className="text-sm font-medium capitalize">
                      {intake.recommended_specialty}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referrals Status */}
          {referrals.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Specialist Referrals</CardTitle>
                <CardDescription>
                  {referrals.length} {referrals.length === 1 ? 'specialist' : 'specialists'} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={`/referrals/${sessionId}`}>
                    View Referrals
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Finding specialists</h3>
                <p className="text-muted-foreground text-center text-sm max-w-sm">
                  We're searching for the best specialists matching your needs. Check back soon or we'll email you options.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Screening in progress</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm text-sm">
              Your screening information is being collected. This page will update once screening is complete.
            </p>
          </CardContent>
        </Card>
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
