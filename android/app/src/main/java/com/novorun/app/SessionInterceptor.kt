package com.novorun.app

import android.content.Context
import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

class SessionInterceptor(private val context: Context) : Interceptor {
    
    companion object {
        private const val LOGIN_ENDPOINT = "/user/auth/signin"
        private const val REGISTER_ENDPOINT = "/user/auth/signup"
    }
    
    @Throws(IOException::class)
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)
        
        // Skip session validation for authentication endpoints
        val url = request.url.toString()
        if (url.contains(LOGIN_ENDPOINT) || url.contains(REGISTER_ENDPOINT)) {
            return response
        }
        
        val sessionManager = SessionManager.getInstance(context)
        
        // Only check session expiry for logged-in users
        if (sessionManager.isUserLoggedIn()) {
            // Check for 401 Unauthorized (token expired)
            if (response.code == 401) {
                // Trigger session expiry on main thread
                SessionExpiryHandler.getInstance(context).handleSessionExpiry()
            }
        }
        
        return response
    }
}
