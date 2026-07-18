import { GameSettingScreen } from '@/components/agent/screens/GameSettingScreen';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Game Setting · ${APP_NAME}` };

export default function Page() {
  return <GameSettingScreen />;
}
