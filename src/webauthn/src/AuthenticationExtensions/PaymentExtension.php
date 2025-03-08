<?php

declare(strict_types=1);

namespace Webauthn\AuthenticationExtensions;

use Webauthn\SecurePaymentConfirmation\PaymentCredentialInstrument;
use Webauthn\SecurePaymentConfirmation\PaymentCurrencyAmount;

final class PaymentExtension extends AuthenticationExtension
{
    public static function register(string $rpId, string $topOrigin, string $payeeName, string $payeeOrigin, PaymentCurrencyAmount $amount, PaymentCredentialInstrument $instrument): AuthenticationExtension
    {
        return self::create('payment', [
            'isPayment' => true,
            'rpId' => $rpId,
            'topOrigin' => $topOrigin,
            'payeeName' => $payeeName,
            'payeeOrigin' => $payeeOrigin,
            'currencyAmount' => $amount,
            'credentialInstrument' => $instrument,
        ]);
    }

    public static function authenticate(): AuthenticationExtension
    {
        return self::create('payment', ['isPayment' => true]);
    }
}
