import { numberToHex as toHex, hexToNumber as fromHex, hexToNumberAt as fromHexAt, isHex } from "./hexutils";
import { IDomainConfig } from "./storage";

const FIXED_RECORD_LENGTH = 7;
const TOTP_SIZE_FIELD_LENGTH = 1;

const FLAG_SPECIAL_CHARACTERS = 0x01;
const FLAG_EXTRA_LONG = 0x02;
const FLAG_TOTP_SECRET = 0x04;

const serializeTotpSecret = (secret?: string): string => {
    if (secret === undefined) return '';
    if (secret.length % 2 || secret.length / 2 > 0xff || !isHex(secret)) throw Error('Invalid TOTP secret');

    return toHex(secret.length / 2) + secret;
};

export const serializeConfig = (domainId: string, config: IDomainConfig): string => {
    let flags = (config.useSpecialCharacters ? FLAG_SPECIAL_CHARACTERS : 0) | (config.allowExtraLongPasswords ? FLAG_EXTRA_LONG : 0);

    const totpSecret = serializeTotpSecret(config.totpSecret);
    if (totpSecret) flags |= FLAG_TOTP_SECRET;

    return '' + domainId
        + toHex(config.passwordLength)
        + toHex(config.passwordIteration)
        + toHex(flags)
        + totpSecret;
};

const assertConfigurationBufferSize = (buffer: string, minimal_size: number) => {
    if (buffer.length < minimal_size * 2) throw Error('Invalid configuration blob');
};

export const deserializeConfig = (raw: string): [string, IDomainConfig, number] => {
    let size = FIXED_RECORD_LENGTH;
    assertConfigurationBufferSize(raw, size);

    const domainId = raw.substring(0, 8);
    const flags = fromHexAt(raw, 6);
    const config: IDomainConfig = {
        passwordLength: fromHexAt(raw, 4),
        passwordIteration: fromHexAt(raw, 5),
        useSpecialCharacters: !!(flags & FLAG_SPECIAL_CHARACTERS),
        allowExtraLongPasswords: !!(flags & FLAG_EXTRA_LONG)
    };

    if (flags & FLAG_TOTP_SECRET) {
        assertConfigurationBufferSize(raw, size + 1);
        const totpSecretSize = fromHexAt(raw, size);
        size += 1;

        assertConfigurationBufferSize(raw, size + totpSecretSize);
        config.totpSecret = raw.substring(size * 2, (size + totpSecretSize) * 2);
        size += totpSecretSize;
    }

    return [domainId, config, size];
};