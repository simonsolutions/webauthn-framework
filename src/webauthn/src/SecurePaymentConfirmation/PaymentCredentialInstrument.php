<?php

declare(strict_types=1);

namespace Webauthn\SecurePaymentConfirmation;

class PaymentCredentialInstrument
{
    public function __construct(
        public string $displayName,
        public string $icon,
     public bool $iconMustBeShown = true,
    )
    {
    }
}
