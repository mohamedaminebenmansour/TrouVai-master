import { FaBell, FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    navigate("/signup");
  };

  const handleSignIn = () => {
    navigate("/login");
  };

  return (
    <div className="w-full h-[8ch] px-6 bg-gray-100 flex items-center justify-between border-b border-gray-200">
      <div className="flex items-center">
        <span className="text-xl font-semibold text-gray-600">ChatChout</span>
      </div>

      <div className="flex items-center gap-x-4">
        {/* Sign Up Button */}
        <button
          onClick={handleSignUp}
          className="flex items-center px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
        >
          <FaUser className="mr-2" />
          Sign Up
        </button>

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 transition-colors"
        >
          Sign In
        </button>

        {/* Notification */}
        {/*
        <button className="relative">
          <div className="w-5 h-5 bg-gray-100 flex items-center justify-center absolute -top-1.5 -right-2.5 rounded-full p-0.5">
            <span className="bg-red-600 text-white rounded-full w-full h-full flex items-center justify-center text-xs">3</span>
          </div>
          <FaBell className="text-xl text-gray-600" />
        </button>*/}

        {/* Profile Image */}
        {/*<img 
          src="https://cdn.pixabay.com/photo/2016/11/21/11/17/model-1844729_640.jpg" 
          alt="profile img" 
          className="w-11 h-11 rounded-full object-cover object-center cursor-pointer" 
        />*/}
      </div>
    </div>
  );
};

export default Navbar;