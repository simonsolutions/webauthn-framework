<?php

declare(strict_types=1);

namespace Webauthn\SecurePaymentConfirmation;

class CollectedClientPaymentData
{

    public function __construct(
        public CollectedClientAdditionalPaymentData $payment,
    )
    {
    }
}
