import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="mb-6">Az oldal nem található.</p>
      <Link to="/" className="text-primary underline">
        Vissza a kezdőlapra
      </Link>
    </div>
  );
};

export default NotFound;