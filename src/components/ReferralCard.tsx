'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Calendar, Star, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { Referral } from '@/lib/types';
import { useState } from 'react';

interface ReferralCardProps {
  referral: Referral;
  isBestMatch?: boolean;
}

export function ReferralCard({ referral, isBestMatch = false }: ReferralCardProps) {
  const [isTracking, setIsTracking] = useState(false);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClick = async () => {
    if (isTracking) return;
    setIsTracking(true);
    
    try {
      await fetch(`/api/referrals/${referral.id}/click`, {
        method: 'GET',
      });
    } catch (error) {
      console.error('Failed to track referral click:', error);
    } finally {
      window.open(referral.booking_url, '_blank');
      setIsTracking(false);
    }
  };

  const nextAvailable = referral.next_available_date
    ? formatDate(referral.next_available_date)
    : null;
  const nextAvailableTime = referral.next_available_date
    ? formatTime(referral.next_available_date)
    : null;

  return (
    <Card className="border-2 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">
                {referral.provider_name}
                {referral.provider_credentials && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    {referral.provider_credentials}
                  </span>
                )}
              </CardTitle>
              {isBestMatch && (
                <Badge variant="success" className="ml-2">
                  Best Match
                </Badge>
              )}
            </div>
            <CardDescription className="text-base">
              {referral.specialty}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location */}
        {(referral.location_city || referral.location_address) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              {referral.location_address && (
                <div className="font-medium">{referral.location_address}</div>
              )}
              {referral.location_city && referral.location_state && (
                <div className="text-muted-foreground">
                  {referral.location_city}, {referral.location_state}
                  {referral.location_zip && ` ${referral.location_zip}`}
                </div>
              )}
              {referral.distance_miles && (
                <div className="text-muted-foreground mt-1">
                  {referral.distance_miles.toFixed(1)} miles away
                </div>
              )}
            </div>
          </div>
        )}

        {/* Availability */}
        {nextAvailable && (
          <div className="flex items-start gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Next available appointment</div>
              <div className="text-muted-foreground">
                {nextAvailable}
                {nextAvailableTime && ` at ${nextAvailableTime}`}
              </div>
            </div>
          </div>
        )}

        {/* Rating */}
        {referral.rating && (
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            <div className="text-sm">
              <span className="font-medium">{referral.rating.toFixed(1)}</span>
              {referral.review_count && (
                <span className="text-muted-foreground ml-1">
                  ({referral.review_count} {referral.review_count === 1 ? 'review' : 'reviews'})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Insurance */}
        {referral.accepted_insurance && referral.accepted_insurance.length > 0 && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Accepted Insurance
            </div>
            <div className="flex flex-wrap gap-2">
              {referral.accepted_insurance.slice(0, 3).map((insurance, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {insurance}
                </Badge>
              ))}
              {referral.accepted_insurance.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{referral.accepted_insurance.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Match Reasons */}
        {referral.match_reasons && referral.match_reasons.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Why we chose this provider
            </div>
            <ul className="space-y-1">
              {referral.match_reasons.map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="pt-4 border-t">
          <Button
            className="w-full"
            size="lg"
            onClick={handleClick}
            disabled={isTracking}
          >
            Book on Zocdoc
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
