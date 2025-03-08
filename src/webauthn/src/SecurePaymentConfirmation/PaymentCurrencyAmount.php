<?php

declare(strict_types=1);

namespace Webauthn\SecurePaymentConfirmation;

class PaymentCurrencyAmount
{
    public function __construct(
        public string $currency,
        public string $value,
    )
    {
    }
}
