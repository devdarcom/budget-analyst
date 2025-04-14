import { useRouter } from 'next/router';
import Logo from './Logo';
import LoginDialog from './LoginDialog';

const Header = () => {
  const router = useRouter();

  return (
    <div className="w-full">
      <div className="flex justify-between items-center py-6 px-4 sm:px-6 lg:px-8">
        <div className="cursor-pointer" onClick={() => router.push("/")}>
          <Logo />
        </div>
        <div>
          <LoginDialog />
        </div>
      </div>
    </div>
  );
};

export default Header;