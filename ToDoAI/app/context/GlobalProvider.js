import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import axios from 'axios';
import { Platform } from 'react-native';

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const user = await AsyncStorage.getItem('user');
            setUser(user);
        }
        fetchUser();
    }, []);


    
    useEffect(() => {
        if (error) {
            console.log(error);
        }
    }, [error]);
    
    
    

    return (
        <GlobalContext.Provider
         value={{ 
            user,
            setUser,
            isAuthenticated,
            setIsAuthenticated,
            isLoading,
            setIsLoading,
            error,
            setError }}>
            {children}
        </GlobalContext.Provider>
    )


}

