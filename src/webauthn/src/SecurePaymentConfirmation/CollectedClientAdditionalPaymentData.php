<?php

declare(strict_types=1);

namespace Webauthn\SecurePaymentConfirmation;

class CollectedClientAdditionalPaymentData
{
    public function __construct(
        public string $rpId,
        public string $topOrigin,
        public string $payeeName,
        public string $payeeOrigin,
        public PaymentCurrencyAmount $total,
        public PaymentCredentialInstrument $instrument,
    ){
    }
}
