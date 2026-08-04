package com.upstyle.bizgrow.ui.navigation

import com.upstyle.bizgrow.ui.Screen
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Dedicated navigation manager to handle screen transitions and back stack.
 * Separates navigation concerns from business logic.
 */
class NavigationManager {
    
    private val _screen = MutableStateFlow<Screen>(Screen.Login)
    val screen: StateFlow<Screen> = _screen.asStateFlow()
    
    private val _screenStack = MutableStateFlow<List<Screen>>(listOf(Screen.Login))
    val screenStack: StateFlow<List<Screen>> = _screenStack.asStateFlow()
    
    /**
     * Navigate to a new screen, adding it to the back stack
     */
    fun navigate(screen: Screen) {
        _screenStack.value = _screenStack.value + screen
        _screen.value = screen
    }
    
    /**
     * Navigate back to the previous screen in the stack
     * @return true if navigation was successful, false if already at root
     */
    fun navigateBack(): Boolean {
        val stack = _screenStack.value
        return if (stack.size > 1) {
            val newStack = stack.dropLast(1)
            _screenStack.value = newStack
            _screen.value = newStack.last()
            true
        } else {
            false
        }
    }
    
    /**
     * Navigate to a screen and clear the entire back stack (e.g., for login/logout)
     */
    fun navigateToRoot(screen: Screen) {
        _screenStack.value = listOf(screen)
        _screen.value = screen
    }
    
    /**
     * Clear the entire navigation stack and reset to initial state
     */
    fun reset() {
        _screenStack.value = listOf(Screen.Login)
        _screen.value = Screen.Login
    }
    
    /**
     * Get current screen depth (useful for debugging)
     */
    val stackDepth: Int
        get() = _screenStack.value.size
    
    /**
     * Check if can navigate back
     */
    val canNavigateBack: Boolean
        get() = _screenStack.value.size > 1
}
