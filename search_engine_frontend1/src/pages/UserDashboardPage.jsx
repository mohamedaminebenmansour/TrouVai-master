import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, History as HistoryIcon, Heart, UserCircle, LogOut } from 'lucide-react';

const UserDashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      try {
        setUser(JSON.parse(userDataString));
      } catch (error) {
        console.error("Erreur lors du parsing des données utilisateur depuis localStorage:", error);
        localStorage.removeItem('user'); 
        localStorage.removeItem('token'); 
        navigate('/login'); 
      }
    } else {
      
      console.warn("Aucune donnée utilisateur trouvée dans localStorage sur le dashboard. Vérifiez ProtectedRoute.");
      
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    navigate('/login');
     
  };

  
  const DashboardFeatureCard = ({ title, description, icon: IconComponent, path, gradientClasses }) => (
    <div
      onClick={() => navigate(path)}
      className={`cursor-pointer p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out ${gradientClasses} text-white flex flex-col items-center text-center`}
    >
      <IconComponent className={`w-12 h-12 mb-4`} /> 
      <h3 className={`text-xl font-semibold mb-2`}>
        {title}
      </h3>
      <p className={`text-sm opacity-90`}>
        {description}
      </p>
    </div>
  );

  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400 text-lg">Chargement des informations utilisateur...</p>
        
      </div>
    );
  }

  return (
    
    <div className="min-h-screen py-8 px-4 pt-12 sm:pt-16"> 
      <div className="max-w-5xl mx-auto">
        
      
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-10 rounded-2xl shadow-xl mb-10 text-center border border-gray-200 dark:border-gray-700/80">
          <UserCircle className="text-7xl text-blue-500 dark:text-blue-400 mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Bienvenue, <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">{user.username || "Utilisateur"}</span> !
          </h1>
          <p className="text-md text-gray-600 dark:text-gray-400 mb-6">
            C'est votre espace personnel. Que souhaitez-vous faire aujourd'hui ?
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center justify-center mx-auto group transition-colors duration-150"
          >
            <LogOut className="mr-1.5 h-4 w-4 group-hover:text-red-700 dark:group-hover:text-red-300"/> Se déconnecter
          </button>
        </div>

      
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <DashboardFeatureCard
            title="Nouvelle Recherche"
            description="Trouvez rapidement les informations dont vous avez besoin."
            icon={Search}
            path="/search"
            gradientClasses="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700"
          />
          <DashboardFeatureCard
            title="Mon Historique"
            description="Revoyez vos recherches précédentes et continuez votre exploration."
            icon={HistoryIcon}
            path="/history" 
            gradientClasses="bg-gradient-to-br from-teal-500 via-green-500 to-lime-600 hover:from-teal-600 hover:via-green-600 hover:to-lime-700"
          />
          <DashboardFeatureCard
            title="Mes Favoris"
            description="Accédez à vos résultats et articles sauvegardés."
            icon={Heart} 
            path="/favorites" 
            gradientClasses="bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600"
          />
        </div>
      </div>
    </div>
  );
};

export default UserDashboardPage;