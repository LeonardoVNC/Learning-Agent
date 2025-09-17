describe('Login de usuario', () => {
  it('Debería iniciar sesión correctamente con credenciales válidas', () => {
    cy.visit('/login');

    cy.get('#login_email').type('estudiante@example.com');
    cy.get('#login_password').type('Estudiante123!');

    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/');
    cy.contains('LEARNING ISC', { timeout: 10000 }).should('be.visible');
  });
});
