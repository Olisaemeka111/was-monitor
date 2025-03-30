import { NextResponse } from 'next/server';
import { getAllAccounts, getAccount, deleteAccount } from '../../models/AWSAccount';

export async function GET() {
  try {
    const accounts = await getAllAccounts();
    // Remove sensitive information
    const safeAccounts = accounts.map(({ access_key_id, secret_access_key, ...rest }) => rest);
    return NextResponse.json(safeAccounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { accountId } = await request.json();
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    await deleteAccount(accountId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
