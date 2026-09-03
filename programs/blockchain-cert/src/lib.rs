use anchor_lang::prelude::*;

declare_id!("7VgDt7rwmPWqHyjViTVQLfYku5WSxbccqfg4xER59hKE");

#[program]
pub mod blockchain_cert {
    use super::*;

    /// Initializes and mints a new Solana blockchain certificate
    pub fn mint_certificate(
        ctx: Context<MintCertificate>,
        cert_id: String,
        student_reg_no: String,
        student_name: String,
        student_address: Pubkey,
        certificate_type: String,
        event_name: String,
        performance_level: String,
        issue_date: String,
        certificate_hash: [u8; 32],
    ) -> Result<()> {
        let cert_account = &mut ctx.accounts.certificate_account;
        let clock = Clock::get()?;

        cert_account.issuer = ctx.accounts.issuer.key();
        cert_account.cert_id = cert_id;
        cert_account.student_reg_no = student_reg_no;
        cert_account.student_name = student_name;
        cert_account.student_address = student_address;
        cert_account.certificate_type = certificate_type;
        cert_account.event_name = event_name;
        cert_account.performance_level = performance_level;
        cert_account.issue_date = issue_date;
        cert_account.certificate_hash = certificate_hash;
        cert_account.mint_timestamp = clock.unix_timestamp;

        msg!("Certificate minted successfully for student: {}", cert_account.student_name);
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(cert_id: String)]
pub struct MintCertificate<'info> {
    #[account(
        init,
        payer = issuer,
        space = 8 + 32 + 64 + 64 + 64 + 32 + 64 + 64 + 32 + 32 + 32 + 8,
        seeds = [b"certificate", cert_id.as_bytes()],
        bump
    )]
    pub certificate_account: Account<'info, CertificateRecord>,

    #[account(mut)]
    pub issuer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct CertificateRecord {
    pub issuer: Pubkey,
    pub cert_id: String,
    pub student_reg_no: String,
    pub student_name: String,
    pub student_address: Pubkey,
    pub certificate_type: String,
    pub event_name: String,
    pub performance_level: String,
    pub issue_date: String,
    pub certificate_hash: [u8; 32],
    pub mint_timestamp: i64,
}
