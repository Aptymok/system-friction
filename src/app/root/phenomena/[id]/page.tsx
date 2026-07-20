import {
  getPhenomenonState,
} from '@/lib/ppoi/ppoiService';

import {
  requireAuthenticatedUser,
} from '@/lib/system/access/server';

import PhenomenonConsole from '@/components/root/PhenomenonConsole';


export const dynamic = 'force-dynamic';


export default async function PhenomenonPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {

  const {
    id,
  } = await params;


  const {
    user,
  } =
    await requireAuthenticatedUser();


  const state =
    await getPhenomenonState(
      user.id,
      id,
    );


  return (
    <PhenomenonConsole
      state={state}
    />
  );

}