import { getSessionDetail, getIntake, getEmailSummary } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { CheckCircle2, Mail, FileText, ArrowRight, Shield } from 'lucide-react';
import { createServerClient } from '@/utils/supabase/server';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

async function getEmailSummaryBySession(sessionId: string) {
  const supabase = await createServerClient();
  const idempotencyKey = `email_${sessionId}`;
  
  const { data, error } = await supabase
    .from('email_summaries')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get email summary: ${error.message}`);
  }
  
  return data || null;
}

export default async function EmailConfirmationPage({ params }: PageProps) {
  const { sessionId } = await params;

  let session, intake, emailSummary;
  try {
    [session, intake, emailSummary] = await Promise.all([
      getSessionDetail(sessionId).then((d) => d.session),
      getIntake(sessionId),
      getEmailSummaryBySession(sessionId),
    ]);
  } catch (error) {
    notFound();
  }

  const emailSent = emailSummary?.status === 'sent';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-4 py-8">
          {emailSent ? (
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
          ) : (
            <div className="rounded-full bg-blue-100 p-4">
              <Mail className="h-12 w-12 text-blue-600" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {emailSent ? 'Referral Summary Sent' : 'Email Summary Prepared'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {emailSent
                ? `We've sent your referral summary to ${emailSummary?.to_email || intake?.user_email}`
                : 'Your referral summary is being prepared and will be sent shortly'}
            </p>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Included</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm mb-1">Screening Summary</div>
              <div className="text-sm text-muted-foreground">
                A clear overview of what you shared during your conversation
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm mb-1">Specialist Options</div>
              <div className="text-sm text-muted-foreground">
                Top recommended specialists matching your needs and preferences
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-1.5 mt-0.5">
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm mb-1">Booking Links</div>
              <div className="text-sm text-muted-foreground">
                Direct links to book appointments with each specialist on Zocdoc
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What Happens Next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">Check your email</div>
                <div className="text-sm text-muted-foreground">
                  {emailSent
                    ? 'Your referral summary has been sent. Check your inbox (and spam folder).'
                    : 'We'll send your referral summary shortly. Check your inbox (and spam folder).'}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                2
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">Review specialist options</div>
                <div className="text-sm text-muted-foreground">
                  Compare providers, read reviews, and check availability
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">Book your appointment</div>
                <div className="text-sm text-muted-foreground">
                  Click the booking link to schedule directly on Zocdoc
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild variant="default" className="flex-1">
          <Link href={`/referrals/${sessionId}/summary`}>
            <FileText className="h-4 w-4 mr-2" />
            View Summary Online
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href={`/referrals/${sessionId}`}>
            View Referrals
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

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
