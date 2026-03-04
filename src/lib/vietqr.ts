/**
 * VietQR - Tạo mã QR thanh toán ngân hàng tự động
 * Tài khoản: TPBank - 5395 8686 888
 */

const BANK_BIN = "970423"; // Mã BIN TPBank
const ACCOUNT_NO = "53958686888";
const ACCOUNT_NAME = "CLUB CAU LONG";

/**
 * Tạo URL hình ảnh QR từ VietQR API
 */
export function generateVietQRUrl(params: {
    amount: number;
    description: string;
    accountNo?: string;
    bankBin?: string;
    accountName?: string;
}): string {
    const {
        amount,
        description,
        accountNo = ACCOUNT_NO,
        bankBin = BANK_BIN,
        accountName = ACCOUNT_NAME,
    } = params;

    // Sử dụng VietQR API (miễn phí, không cần key)
    const encodedDesc = encodeURIComponent(description);
    return `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodeURIComponent(accountName)}`;
}

/**
 * Tạo nội dung chuyển khoản chuẩn
 */
export function generateTransferDescription(params: {
    invoiceId: string;
    playerName: string;
    period?: string;
}): string {
    const { invoiceId, playerName, period } = params;
    // Rút ngắn để phù hợp nội dung CK ngân hàng (tối đa ~50 ký tự)
    const shortId = invoiceId.slice(-8).toUpperCase();
    const name = playerName.replace(/\s+/g, "").slice(0, 15);
    return `CL ${shortId} ${name}${period ? ` T${period.replace("-", "")}` : ""}`;
}

export const BANK_INFO = {
    bankName: "TPBank",
    bankBin: BANK_BIN,
    accountNo: ACCOUNT_NO,
    accountName: ACCOUNT_NAME,
};
