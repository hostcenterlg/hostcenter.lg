export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-bold text-emerald-600">
            Portal360
          </h1>

          <p className="text-2xl text-gray-600 max-w-2xl mx-auto">
            Sua plataforma completa de e-commerce com catálogo digital e vendas via WhatsApp
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">Catálogo Digital</h3>
              <p className="text-gray-600">
                Organize seus produtos em categorias e exiba de forma profissional
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Vendas via WhatsApp</h3>
              <p className="text-gray-600">
                Conecte-se diretamente com seus clientes pelo WhatsApp
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold mb-2">Personalizável</h3>
              <p className="text-gray-600">
                Customize cores, logo e aparência da sua loja
              </p>
            </div>
          </div>

          <div className="mt-12">
            <button className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-emerald-700 transition-colors">
              Começar Agora
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
